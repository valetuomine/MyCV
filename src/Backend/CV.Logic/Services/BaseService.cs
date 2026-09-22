using CV.DataAccess;

namespace CV.Logic.Services
{
    public class BaseService
    {
        protected CvContext DbContext { get; set; }

        protected BaseService(CvContext dataContext)
        {
            DbContext = dataContext;
        }
    }
}
